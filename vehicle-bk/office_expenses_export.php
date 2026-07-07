<?php  
	include( "ka_include/session.php" );
	include( "ka_include/common_function.php" );
	include( "ka_include/ka_config.php" );
	include( "ka_include/check_admin_login.php" ); 
 	// echo "YES"; exit;
	// Check Module Rights
	$query_module_detail = "SELECT * FROM admin_login ld where adm_id='" . $_SESSION[ 'adm_id' ] . "' and adm_status=1";
	$module_query = $con->query( $query_module_detail );
	$row_md_id = $module_query->fetch_array();
	// echo $row_state['md_id']; exit;
	$md_right = explode( ",", $row_md_id[ 'md_id' ] );
	if ( !in_array( "10", $md_right ) ) {
	header( 'Location: #' );
	}
	// Check Module Rights
	$strdate = $_GET['strdate'];
	$enddate = $_GET['enddate'];
	$oexp_incexp = $_GET['oexp_incexp'];
	// echo $oexp_incexp ; exit;
	$strdate = date("Y-m-d", strtotime($strdate));
	$enddate = date("Y-m-d", strtotime($enddate));
	 
	$strdate3 = date("d-m-Y", strtotime($strdate));
	$enddate3 = date("d-m-Y", strtotime($enddate));
	$strdate22 = date("d_M_Y");
	if($oexp_incexp==1){
		$aol_tp_qu = "and td.oexp_incexp=1";
		$fl_nam = "DailyHisabIncome";
	} else if($oexp_incexp==2){
		$aol_tp_qu = "and td.oexp_incexp=2";
		$fl_nam = "DailyHisabExpense";
	} else {
		$aol_tp_qu = "and td.oexp_incexp IN (1,2)";
		$fl_nam = "DailyHisabIncomeExpense";
	}


	$queryCollection = "SELECT * FROM office_expenses_detail td  where td.oexp_status=1 and td.branch_id=".$_SESSION[ 'adm_branch' ]." ".$aol_tp_qu." and Date(td.oexp_date) >= '$strdate' and Date(td.oexp_date) <= '$enddate'  ORDER BY td.oexp_date DESC";
	// and al.added_by=" . $_SESSION['user_id'] . "
	$resultCollection = $con->query($queryCollection);
	$total_records_rep = $resultCollection->num_rows;

	
	// echo $total_records_rep; exit;
	if($total_records_rep<=0){
		header( 'Location: office_expenses_view.php?msg=empty&strdate='.$strdate3.'&enddate='.$enddate3.'' );
	}

	$query_income = "SELECT SUM(oexp_amount) as total_income FROM office_expenses_detail td where td.oexp_status=1 and td.branch_id=".$_SESSION[ 'adm_branch' ]." and td.oexp_incexp=1 and Date(td.oexp_date) >= '$strdate' and Date(td.oexp_date) <= '$enddate'";
	$result_income = $con->query( $query_income );
	$row_income = $result_income->fetch_object();
	$final_income = $row_income->total_income;

	$query_expense = "SELECT SUM(oexp_amount) as total_expense FROM office_expenses_detail td where td.oexp_status=1 and td.branch_id=".$_SESSION[ 'adm_branch' ]." and td.oexp_incexp=2 and Date(td.oexp_date) >= '$strdate' and Date(td.oexp_date) <= '$enddate'";
	$result_expense = $con->query( $query_expense );
	$row_expense = $result_expense->fetch_object();
	$final_expense = $row_expense->total_expense;
	$final_balance = $final_income-$final_expense;
?>
<?php
$date = time();
header("Content-type: application/vnd-ms-excel");
 
	header("Content-Disposition: attachment; filename=".$fl_nam."ReportDateWise-$strdate22.xls");
?>
<table border="1" style="text-align: left;">
	<h2 class="text-center"> 
	
	<?php if($oexp_incexp==1){ ?>
	<span style="color: green;">Total Income : <b><?php echo "&#8377;".number_format($final_income,2); ?></b></span> 
	<?php } else if($oexp_incexp==2){ ?>
		<span style="color: red;">Total Expense : <b><?php echo "&#8377;".number_format($final_expense,2); ?></b></span>
	<?php } else { ?>
		<span style="color: green;">Income : <b><?php echo "&#8377;".number_format($final_income,2); ?></b></span> - <span style="color: red;">Expense : <b><?php echo "&#8377;".number_format($final_expense,2); ?></b></span> = <span style="color: blue;">Balance : <b><?php echo "&#8377;".number_format($final_balance,2); ?></b></span> 
	<?php } ?>
	 

	</h2>
  <tr style="text-align: left; background:#000; color: #fff;">
    <th style="text-align: left;">No</th>
    <th style="text-align: left;">Description </th>
    <th style="text-align: left;">Amount</th>
    <th style="text-align: left;">Date</th>
    <th style="text-align: left;">Type</th>
  </tr>
  <?php
	$no = 1;
	$counter = 1;
	$result_collaction = $con->query($queryCollection);
	while ($collectionData = $result_collaction->fetch_object()) {

			if($collectionData->oexp_incexp==1) { $prak ="Income"; } else { $prak ="Expense"; }
			$datend = new DateTime( $collectionData->oexp_date ); 
			$col_date = $datend->format( 'd-m-Y' );
			$oexp_amount = number_format($collectionData->oexp_amount,2);

			if($collectionData->oexp_incexp==1) { $tr_col="#BDE7BD"; } else { $tr_col="#FFD5D4"; }
			echo '<tr style="background:'.$tr_col.'">';
			echo '<td>'.$collectionData->oexp_id.'</td>';	
			echo '<td>'.$collectionData->oexp_description.'</td>';	
			echo '<td>&#8377;'.$oexp_amount.'</td>';	
			echo '<td>'.$col_date.'</td>';	
			echo '<td>'.$prak.'</td>';	
			echo '</tr>';
		$no++;
 	}  
	?>
   
</table>