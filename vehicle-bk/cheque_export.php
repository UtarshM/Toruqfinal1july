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
	if ( !in_array( "13", $md_right ) ) {
	header( 'Location: #' );
	}
	// Check Module Rights
	$strdate = $_GET['strdate'];
	$enddate = $_GET['enddate'];
	$strdate = date("Y-m-d", strtotime($strdate));
	$enddate = date("Y-m-d", strtotime($enddate));
	 
	$strdate3 = date("d-m-Y", strtotime($strdate));
	$enddate3 = date("d-m-Y", strtotime($enddate));
	$strdate22 = date("d_M_Y");
	 


	$queryCollection = "SELECT * FROM cheque_detail td  where td.chq_status=1 and td.branch_id=".$_SESSION[ 'adm_branch' ]." ".$aol_tp_qu." and Date(td.chq_date) >= '$strdate' and Date(td.chq_date) <= '$enddate'  ORDER BY td.chq_date DESC";
	// and al.added_by=" . $_SESSION['user_id'] . "
	$resultCollection = $con->query($queryCollection);
	$total_records_rep = $resultCollection->num_rows;

	
	// echo $total_records_rep; exit;
	if($total_records_rep<=0){
		header( 'Location: cheque_view.php?msg=empty&strdate='.$strdate3.'&enddate='.$enddate3.'' );
	}

	$query_income = "SELECT SUM(chq_amount) as total_income FROM cheque_detail td where td.chq_status=1 and td.branch_id=".$_SESSION[ 'adm_branch' ]." and Date(td.chq_date) >= '$strdate' and Date(td.chq_date) <= '$enddate'";
	$result_income = $con->query( $query_income );
	$row_income = $result_income->fetch_object();
	$final_income = $row_income->total_income;

	$query_expense = "SELECT SUM(chq_amount) as total_expense FROM cheque_detail td where td.chq_status=1 and td.branch_id=".$_SESSION[ 'adm_branch' ]." and Date(td.chq_date) >= '$strdate' and Date(td.chq_date) <= '$enddate'";
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
	 
  <tr style="text-align: left; background:#000; color: #fff;">
    <th style="text-align: left;">No</th>
    <th style="text-align: left;">Cheque No.</th>
    <th style="text-align: left;">Reg No.</th>
    <th style="text-align: left;">Bank </th>
    <th style="text-align: left;">Amount</th>
    <th style="text-align: left;">Date</th>
    <th style="text-align: left;">Type</th>
  </tr>
  <?php
	$no = 1;
	$counter = 1;
	$result_collaction = $con->query($queryCollection);
	while ($collectionData = $result_collaction->fetch_object()) {

 			$datend = new DateTime( $collectionData->chq_date ); 
			$col_date = $datend->format( 'd-m-Y' );
			$chq_amount = number_format($collectionData->chq_amount,2);

 			echo '<tr style="background:'.$tr_col.'">';
			echo '<td>'.$collectionData->chq_id.'</td>';	
			echo '<td>'.$collectionData->chq_no.'</td>';	
			echo '<td>'.$collectionData->chq_regno.'</td>';	
			echo '<td>'.$collectionData->chq_bank.'</td>';	
			echo '<td>&#8377;'.$chq_amount.'</td>';	
			echo '<td>'.$col_date.'</td>';	
			echo '<td>'.$prak.'</td>';	
			echo '</tr>';
		$no++;
 	}  
	?>
   
</table>