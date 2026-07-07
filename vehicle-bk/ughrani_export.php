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
	if ( !in_array( "15", $md_right ) ) {
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
	 
	$queryCollection = "SELECT * FROM ughrani_detail td  where td.ugh_status=1 and td.branch_id=".$_SESSION[ 'adm_branch' ]." ".$aol_tp_qu." and Date(td.ugh_date) >= '$strdate' and Date(td.ugh_date) <= '$enddate'  ORDER BY td.ugh_date DESC";
	// and al.added_by=" . $_SESSION['user_id'] . "
	$resultCollection = $con->query($queryCollection);
	$total_records_rep = $resultCollection->num_rows;

	
	// echo $total_records_rep; exit;
	if($total_records_rep<=0){
		header( 'Location: ughrani_view.php?msg=empty&strdate='.$strdate3.'&enddate='.$enddate3.'' );
	}

	 

	 
?>
<?php
$date = time();
header("Content-type: application/vnd-ms-excel");
 
	header("Content-Disposition: attachment; filename=".$fl_nam."UghraniReportDateWise-$strdate22.xls");
?>
<table border="1" style="text-align: left;">
	 
  <tr style="text-align: left; background:#000; color: #fff;">
    <th style="text-align: left;">No</th>
    <th style="text-align: left;">Name</th>
    <th style="text-align: left;">Contact</th>
    <th style="text-align: left;">Descripiton </th>
    <th style="text-align: left;">Amount</th>
    <th style="text-align: left;">Date</th>
    <th style="text-align: left;">Due Date</th>
   </tr>
  <?php
	$no = 1;
	$counter = 1;
	$result_collaction = $con->query($queryCollection);
	while ($collectionData = $result_collaction->fetch_object()) {

 			$datend = new DateTime( $collectionData->ugh_date ); 
			$col_date = $datend->format( 'd-m-Y' );
 			
			$datend_due = new DateTime( $collectionData->ugh_due_date ); 
			$col_due_date = $datend_due->format( 'd-m-Y' );
			$ugh_amount = number_format($collectionData->ugh_amount,2);

 			echo '<tr style="background:'.$tr_col.'">';
			echo '<td>'.$collectionData->ugh_id.'</td>';	
			echo '<td>'.$collectionData->ugh_name.'</td>';	
			echo '<td>'.$collectionData->ugh_contact.'</td>';	
			echo '<td>'.$collectionData->ugh_descripiton.'</td>';	
			echo '<td>&#8377;'.$ugh_amount.'</td>';	
			echo '<td>'.$col_date.'</td>';	
			echo '<td>'.$col_due_date.'</td>';	
 			echo '</tr>';
		$no++;
 	}  
	?>
   
</table>